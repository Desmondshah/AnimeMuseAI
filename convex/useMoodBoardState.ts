// hooks/useMoodBoardState.ts
import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';

interface MoodBoardState {
  selectedCues: string[];
  cueIntensities: Record<string, number>;
  advancedMode: boolean;
  savedMoodboards: SavedMoodboard[];
  searchFilter: string;
  selectedCategory: string;
}

interface SavedMoodboard {
  id: string;
  name: string;
  cues: string[];
  intensities: Record<string, number>;
  createdAt: number;
}

export const useMoodBoardState = () => {
  const [state, setState] = useState<MoodBoardState>({
    selectedCues: [],
    cueIntensities: {},
    advancedMode: false,
    savedMoodboards: [],
    searchFilter: '',
    selectedCategory: 'All'
  });

  // Load saved mood boards from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('animuse-saved-moodboards');
    if (saved) {
      try {
        const savedMoodboards = JSON.parse(saved);
        setState(prev => ({ ...prev, savedMoodboards }));
      } catch (error) {
        console.warn('Failed to load saved mood boards:', error);
      }
    }
  }, []);

  // Save mood boards to localStorage when they change
  useEffect(() => {
    if (state.savedMoodboards.length > 0) {
      localStorage.setItem('animuse-saved-moodboards', JSON.stringify(state.savedMoodboards));
    }
  }, [state.savedMoodboards]);

  const updateSelectedCues = useCallback((cues: string[]) => {
    setState(prev => ({ ...prev, selectedCues: cues }));
  }, []);

  const updateIntensity = useCallback((cueId: string, intensity: number) => {
    setState(prev => ({
      ...prev,
      cueIntensities: { ...prev.cueIntensities, [cueId]: intensity }
    }));
  }, []);

  const toggleAdvancedMode = useCallback(() => {
    setState(prev => ({ ...prev, advancedMode: !prev.advancedMode }));
  }, []);

  const updateSearchFilter = useCallback((filter: string) => {
    setState(prev => ({ ...prev, searchFilter: filter }));
  }, []);

  const updateSelectedCategory = useCallback((category: string) => {
    setState(prev => ({ ...prev, selectedCategory: category }));
  }, []);

  const saveMoodboard = useCallback((name: string, description?: string) => {
    if (state.selectedCues.length === 0) {
      toast.error('Select some mood cues first!');
      return false;
    }

    const newMoodboard: SavedMoodboard = {
      id: Date.now().toString(),
      name,
      cues: [...state.selectedCues],
      intensities: { ...state.cueIntensities },
      createdAt: Date.now()
    };

    setState(prev => ({
      ...prev,
      savedMoodboards: [...prev.savedMoodboards, newMoodboard]
    }));

    toast.success(`Mood board "${name}" saved!`);
    return true;
  }, [state.selectedCues, state.cueIntensities]);

  const loadMoodboard = useCallback((moodboard: SavedMoodboard) => {
    setState(prev => ({
      ...prev,
      selectedCues: [...moodboard.cues],
      cueIntensities: { ...moodboard.intensities }
    }));
    toast.success(`Loaded "${moodboard.name}"!`);
  }, []);

  const deleteMoodboard = useCallback((moodboardId: string) => {
    setState(prev => ({
      ...prev,
      savedMoodboards: prev.savedMoodboards.filter(mb => mb.id !== moodboardId)
    }));
    toast.success('Mood board deleted!');
  }, []);

  const clearSelection = useCallback(() => {
    setState(prev => ({
      ...prev,
      selectedCues: [],
      cueIntensities: {}
    }));
  }, []);

  return {
    state,
    actions: {
      updateSelectedCues,
      updateIntensity,
      toggleAdvancedMode,
      updateSearchFilter,
      updateSelectedCategory,
      saveMoodboard,
      loadMoodboard,
      deleteMoodboard,
      clearSelection
    }
  };
};
