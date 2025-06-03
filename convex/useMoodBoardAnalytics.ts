// hooks/useMoodBoardAnalytics.ts
import { useCallback } from 'react';

interface AnalyticsEvent {
  event: string;
  properties: Record<string, any>;
  timestamp: number;
}

export const useMoodBoardAnalytics = () => {
  const trackEvent = useCallback((eventName: string, properties: Record<string, any>) => {
    // In a real app, you'd send this to your analytics service
    const event: AnalyticsEvent = {
      event: eventName,
      properties: {
        ...properties,
        source: 'mood_board',
        user_agent: navigator.userAgent,
        screen_width: window.screen.width,
        screen_height: window.screen.height
      },
      timestamp: Date.now()
    };
    
    // For now, just log to console
    console.log('📊 Mood Board Analytics:', event);
    
    // You could also store locally for later batch upload
    const stored = localStorage.getItem('mood-board-analytics') || '[]';
    const events = JSON.parse(stored);
    events.push(event);
    
    // Keep only last 100 events
    const recentEvents = events.slice(-100);
    localStorage.setItem('mood-board-analytics', JSON.stringify(recentEvents));
  }, []);

  const trackMoodSelection = useCallback((cue: string, isSelected: boolean, intensity?: number) => {
    trackEvent('mood_cue_toggled', {
      cue_name: cue,
      is_selected: isSelected,
      intensity: intensity,
      action: isSelected ? 'select' : 'deselect'
    });
  }, [trackEvent]);

  const trackPresetUsage = useCallback((presetId: string, presetName: string) => {
    trackEvent('preset_applied', {
      preset_id: presetId,
      preset_name: presetName
    });
  }, [trackEvent]);

  const trackMoodBoardSave = useCallback((name: string, cueCount: number) => {
    trackEvent('mood_board_saved', {
      name: name,
      cue_count: cueCount
    });
  }, [trackEvent]);

  const trackRecommendationRequest = useCallback((
    cues: string[], 
    advancedMode: boolean, 
    resultCount: number
  ) => {
    trackEvent('recommendations_requested', {
      selected_cues: cues,
      cue_count: cues.length,
      advanced_mode: advancedMode,
      result_count: resultCount
    });
  }, [trackEvent]);

  const trackModeToggle = useCallback((newMode: 'simple' | 'advanced') => {
    trackEvent('mode_toggled', {
      new_mode: newMode
    });
  }, [trackEvent]);

  return {
    trackMoodSelection,
    trackPresetUsage,
    trackMoodBoardSave,
    trackRecommendationRequest,
    trackModeToggle,
    trackEvent
  };
};
